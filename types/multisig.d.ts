declare module 'multisig' {
  import { BigNumber } from 'bignumber.js';
  import {
    AnyContract,
    Contract,
    ContractBase,
    Deployer,
    TransactionOptions,
    TransactionResult,
    TruffleArtifacts
  } from 'truffle';
  import { AnyNumber } from 'web3';

  namespace multisig {
    interface Migrations extends ContractBase {
      setCompleted(
        completed: number,
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      upgrade(
        address: Address,
        options?: TransactionOptions
      ): Promise<TransactionResult>;
    }

    interface Multisig extends ContractBase {
      nonce(): Promise<BigNumber>;

      owners(index: number): Promise<Address>;
      listOwners(): Promise<Address[]>;

      execute(
        v: number[],
        r: string[],
        s: string[],
        to: Address,
        value: AnyNumber,
        data: string,
        options?: TransactionOptions
      ): Promise<TransactionResult>;
    }

    interface DepositedEvent {
      from: Address;
      value: BigNumber;
    }

    interface ExecutedEvent {
      destination: Address;
      nonce: BigNumber;
      value: BigNumber;
      data: string;
    }

    interface TransferableMultisig extends Multisig {
      transferOwnership(
        v: number[],
        r: string[],
        s: string[],
        newOwners: Address[],
        options?: TransactionOptions
      ): Promise<TransactionResult>;
    }

    interface RecoverableMultisig extends Multisig {
      recoveryBlockOffset(): Promise<BigNumber>;
      recoveryBlock(): Promise<BigNumber>;
      recoveryHash(): Promise<string>;

      startRecovery(
        newOwners: Address[],
        options?: TransactionOptions
      ): Promise<TransactionResult>;

      cancelRecovery(options?: TransactionOptions): Promise<TransactionResult>;

      confirmRecovery(
        newOwners: Address[],
        options?: TransactionOptions
      ): Promise<TransactionResult>;
    }

    interface RecoveryStartedEvent {
      from: Address;
      newOwners: Address[];
    }

    interface RecoveryCancelledEvent {
      from: Address;
    }

    interface RecoveryConfirmedEvent {
      from: Address;
      newOwners: Address[];
    }

    interface MigrationsContract extends Contract<Migrations> {
      'new'(options?: TransactionOptions): Promise<Migrations>;
    }

    interface MultisigContract extends Contract<Multisig> {
      'new'(owners: Address[], options?: TransactionOptions): Promise<Multisig>;
    }

    interface RecoverableMultisigContract
      extends Contract<RecoverableMultisig> {
      'new'(
        owners: Address[],
        recoveryBlockOffset: AnyNumber,
        options?: TransactionOptions
      ): Promise<RecoverableMultisig>;
    }

    interface TransferableMultisigContract
      extends Contract<TransferableMultisig> {
      'new'(
        owners: Address[],
        options?: TransactionOptions
      ): Promise<TransferableMultisig>;
    }

    interface TestERC20TokenContract extends Contract<ERC20> {
      'new'(options?: TransactionOptions): Promise<ERC20>;
    }

    interface MultisigArtifacts extends TruffleArtifacts {
      require(name: string): AnyContract;
      require(name: './Migrations.sol'): MigrationsContract;
      require(name: './Multisig.sol'): MultisigContract;
      require(name: './RecoverableMultisig.sol'): RecoverableMultisigContract;
      require(name: './TransferableMultisig.sol'): TransferableMultisigContract;
      require(name: './Test/TestERC20Token.sol'): TestERC20TokenContract;
    }

    interface MultisigDeployer extends Deployer {
      deploy(contract: MigrationsContract): Promise<void>;
    }

    interface ERC20 extends ContractBase {
      totalSupply(): Promise<BigNumber>;

      balanceOf(who: Address): Promise<BigNumber>;
      allowance(owner: Address, spender: Address): Promise<BigNumber>;

      transfer(to: Address, value: BigNumber): Promise<TransactionResult>;
      transferFrom(
        from: Address,
        to: Address,
        value: AnyNumber
      ): Promise<TransactionResult>;
      approve(spender: Address, value: AnyNumber): Promise<TransactionResult>;
    }
  }

  export = multisig;
}
