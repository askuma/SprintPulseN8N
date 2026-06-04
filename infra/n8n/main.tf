terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ---- n8n ECS Fargate Task (Architecture B) ----

variable "cluster_id"         { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "security_group_id"  { type = string }
variable "n8n_image"          { type = string; default = "n8nio/n8n:latest" }
variable "rds_endpoint"       { type = string }
variable "n8n_secret_arn"     { type = string; description = "ARN of Secrets Manager secret containing N8N_ENCRYPTION_KEY and DB password" }
variable "environment"        { type = string; default = "production" }

resource "aws_cloudwatch_log_group" "n8n" {
  name              = "/sprintpulse/${var.environment}/n8n"
  retention_in_days = 30
}

resource "aws_iam_role" "n8n_task" {
  name = "sprintpulse-n8n-task-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "n8n_task_policy" {
  role = aws_iam_role.n8n_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [var.n8n_secret_arn]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.n8n.arn}:*"
      }
    ]
  })
}

resource "aws_ecs_task_definition" "n8n" {
  family                   = "sprintpulse-n8n-${var.environment}"
  cpu                      = "1024"
  memory                   = "2048"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.n8n_task.arn
  task_role_arn            = aws_iam_role.n8n_task.arn

  container_definitions = jsonencode([{
    name      = "n8n"
    image     = var.n8n_image
    essential = true

    portMappings = [{ containerPort = 5678, protocol = "tcp" }]

    environment = [
      { name = "N8N_HOST",              value = "0.0.0.0" },
      { name = "N8N_PORT",              value = "5678" },
      { name = "N8N_PROTOCOL",          value = "https" },
      { name = "GENERIC_TIMEZONE",      value = "UTC" },
      { name = "N8N_DB_TYPE",           value = "postgresdb" },
      { name = "N8N_DB_POSTGRESDB_HOST", value = var.rds_endpoint },
      { name = "N8N_DB_POSTGRESDB_PORT", value = "5432" },
      { name = "N8N_DB_POSTGRESDB_DATABASE", value = "n8n" },
      { name = "N8N_DB_POSTGRESDB_USER",     value = "n8n" },
      { name = "N8N_METRICS",           value = "true" },
      { name = "N8N_LOG_LEVEL",         value = "info" },
      { name = "N8N_BASIC_AUTH_ACTIVE", value = "true" }
    ]

    secrets = [
      { name = "N8N_ENCRYPTION_KEY",         valueFrom = "${var.n8n_secret_arn}:N8N_ENCRYPTION_KEY::" },
      { name = "N8N_DB_POSTGRESDB_PASSWORD", valueFrom = "${var.n8n_secret_arn}:N8N_DB_PASSWORD::" },
      { name = "N8N_BASIC_AUTH_USER",        valueFrom = "${var.n8n_secret_arn}:N8N_BASIC_AUTH_USER::" },
      { name = "N8N_BASIC_AUTH_PASSWORD",    valueFrom = "${var.n8n_secret_arn}:N8N_BASIC_AUTH_PASSWORD::" }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.n8n.name
        awslogs-region        = "us-east-1"
        awslogs-stream-prefix = "n8n"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:5678/healthz || exit 1"]
      interval    = 30
      timeout     = 10
      retries     = 3
      startPeriod = 60
    }
  }])
}

resource "aws_ecs_service" "n8n" {
  name            = "sprintpulse-n8n-${var.environment}"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.n8n.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.security_group_id]
    assign_public_ip = false
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

output "n8n_service_name" {
  value = aws_ecs_service.n8n.name
}
