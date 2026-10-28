/** Thrown when a save slot is malformed or from an unsupported version. */
export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveError';
  }
}
