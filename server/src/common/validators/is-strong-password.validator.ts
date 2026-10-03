import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export function isStrongPassword(password: any): boolean {
  if (typeof password !== 'string') return false;

  // Minimum 8 characters
  if (password.length < 8) return false;
  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) return false;
  // At least one lowercase letter
  if (!/[a-z]/.test(password)) return false;
  // At least one digit
  if (!/[0-9]/.test(password)) return false;
  // At least one special symbol
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return false;

  return true;
}

@ValidatorConstraint({ async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: any): boolean {
    return isStrongPassword(password);
  }

  defaultMessage(): string {
    return 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character.';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
