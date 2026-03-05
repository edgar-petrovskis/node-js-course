export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials');
  }
}
export class EmailAlreadyExistsError extends Error {
  constructor() {
    super('Email already exists');
  }
}
export class InvalidRefreshTokenError extends Error {
  constructor() {
    super('Invalid refresh token');
  }
}
