import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { unprocessable } from '../utils/apiResponse';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    unprocessable(res, errors.array());
    return;
  }
  next();
}
