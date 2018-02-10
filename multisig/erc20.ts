import { getData, MultisigExecutor } from './executor';
import { Signature } from './transaction';

import { ERC20, Multisig } from 'multisig';
import { TransactionResult } from 'truffle';

import * as Web3 from 'web3';

export class TransferERC20Command {
  private readonly execution: MultisigExecutor;

  constructor(
    private web3: Web3,
    private multisig: Multisig,
    private token: ERC20
  ) {
    this.execution = new MultisigExecutor(web3, multisig);
  }

  public async sign(
    signer: Address,
    nonce: Web3.AnyNumber,
    destination: Address,
    amount: Web3.AnyNumber
  ): Promise<Signature> {
    const data = await getData(this.token.transfer, destination, amount);
    return this.execution.sign(signer, nonce, this.token.address, 0, data);
  }

  public async execute(
    signatures: Signature[],
    destination: Address,
    amount: Web3.AnyNumber
  ): Promise<TransactionResult> {
    const data = await getData(this.token.transfer, destination, amount);
    return this.execution.execute(signatures, this.token.address, 0, data);
  }
}
