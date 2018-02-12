import { MultisigExecutor } from './executor';
import { Signature } from './transaction';

import { Multisig } from 'multisig';
import { TransactionResult } from 'truffle';

import * as Web3 from 'web3';

export class TransferCommand {
  private readonly executor: MultisigExecutor;

  constructor(private web3: Web3, private multiSig: Multisig) {
    this.executor = new MultisigExecutor(web3, multiSig);
  }

  public sign(
    signer: Address,
    nonce: Web3.AnyNumber,
    destination: Address,
    value: Web3.AnyNumber
  ): Signature {
    return this.executor.sign(signer, nonce, destination, value, '0x');
  }

  public async execute(
    signatures: Signature[],
    destination: Address,
    value: Web3.AnyNumber
  ): Promise<TransactionResult> {
    return this.executor.execute(signatures, destination, value, '0x');
  }
}
