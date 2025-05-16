import { User } from '../models/User.entity';
import { Request } from 'express';

export default interface IRequest extends Request {
  user: User;
  file: any;
}
