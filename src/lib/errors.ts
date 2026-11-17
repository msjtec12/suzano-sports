export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Autenticação obrigatória para acessar este recurso.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Seu perfil não possui permissão para realizar esta operação.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Registro não encontrado.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = "Saldo de estoque insuficiente para concluir a operação.") {
    super(message, 409, "INSUFFICIENT_STOCK");
  }
}
