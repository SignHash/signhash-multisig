import { Multisig } from 'multisig';

export class MultisigTestContext<T extends Multisig> {
  // Contract instance must be initialized in `beforeEach` hook and
  // TypeScript cannot determine its initialization
  private _multisig?: T = undefined;

  get multisig(): T {
    if (!this._multisig) {
      throw new Error('Multisig not initialized');
    }

    return this._multisig;
  }

  set multisig(instance: T) {
    this._multisig = instance;
  }

  public constructor(public accounts: Address[], public owners: Address[]) {}
}
