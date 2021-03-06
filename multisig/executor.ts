import {
  groupSignatures,
  MultisigTransaction,
  Signature,
  stripHex,
  toHex
} from './transaction';

import { Multisig } from 'multisig';
import { Method, TransactionResult } from 'truffle';

import * as Web3 from 'web3';

export class MultisigExecutor {
  private readonly transaction: MultisigTransaction;

  constructor(private web3: Web3, private multisig: Multisig) {
    this.transaction = new MultisigTransaction(web3, multisig.address);
  }

  public sign(
    signer: Address,
    nonce: Web3.AnyNumber,
    destination: Address,
    value: Web3.AnyNumber,
    data: string
  ): Signature {
    return this.transaction.sign(signer, nonce, [
      stripHex(destination),
      toHex(value, 64),
      stripHex(data)
    ]);
  }

  public async execute(
    signatures: Signature[],
    destination: Address,
    value: Web3.AnyNumber,
    data: string
  ): Promise<TransactionResult> {
    const { v, r, s } = groupSignatures(signatures);
    return this.multisig.execute(v, r, s, destination, value, data);
  }
}

export async function getData(func: any, ...args: any[]): Promise<string> {
  const method = (func as any) as Method;
  const request = await method.request(...args);
  const [param] = request.params;
  return param.data;
}
