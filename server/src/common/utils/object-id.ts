import { Types } from 'mongoose';

/** Builds a query that matches a document by ObjectId or by an alternate unique field. */
export function idOrField(id: string, field: string, fieldValue: unknown = id.trim()) {
  const trimmed = (id || '').trim();
  return Types.ObjectId.isValid(trimmed)
    ? { $or: [{ _id: new Types.ObjectId(trimmed) }, { [field]: fieldValue }] }
    : { [field]: fieldValue };
}
