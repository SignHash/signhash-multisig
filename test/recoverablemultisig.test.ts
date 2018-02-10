import { BigNumber } from 'bignumber.js';
import { assert } from 'chai';

import * as tempo from '@digix/tempo';
import * as Web3 from 'web3';

import {
  MultisigArtifacts,
  RecoverableMultisig,
  RecoveryCancelledEvent,
  RecoveryConfirmedEvent,
  RecoveryStartedEvent
} from 'multisig';
import { ContractContextDefinition } from 'truffle';

import { toHex } from '../multisig';

import { MultisigTestContext } from './context';
import { assertNumberEqual, assertReverts, findLastLog } from './helpers';

declare const web3: Web3;
declare const artifacts: MultisigArtifacts;
declare const contract: ContractContextDefinition;

const RecoverableMultisigContract = artifacts.require(
  './RecoverableMultisig.sol'
);

contract('RecoverableMultisig', accounts => {
  const recoveryBlockOffset = 100;

  describe('#ctor', () => {
    it('should not allow empty list of owners', async () => {
      await assertReverts(async () => {
        await RecoverableMultisigContract.new([], recoveryBlockOffset);
      });
    });
  });

  const ownerSets = [[accounts[2]], accounts.slice(1, 3), accounts.slice(2, 6)];
  ownerSets.map(owners => {
    context(`When wallet has ${owners.length} owners`, () => {
      const ctx = new MultisigTestContext<RecoverableMultisig>(
        accounts,
        owners
      );

      beforeEach(async () => {
        ctx.multisig = await RecoverableMultisigContract.new(
          owners,
          recoveryBlockOffset
        );
      });

      describe('#startRecovery', () => testStartRecovery(ctx));
      describe('#cancelRecovery', () => testCancelRecovery(ctx));
      describe('#confirmRecovery', () => testConfirmRecovery(ctx));
    });
  });
});

export function testStartRecovery(
  ctx: MultisigTestContext<RecoverableMultisig>
) {
  const nonOwner = ctx.accounts[0];
  const newOwners = ctx.accounts.slice(6, 9);

  // preconditions
  beforeEach(async () => {
    assert.deepEqual(ctx.owners, await ctx.multisig.listOwners());
    assert.notInclude(ctx.owners, nonOwner);
    assert.notDeepEqual(newOwners, ctx.owners);
  });

  it('should revert when called by non-owner', async () => {
    await assertReverts(async () => {
      await ctx.multisig.startRecovery(newOwners, { from: nonOwner });
    });
  });

  ctx.owners.map((owner, index) => {
    context(`When called by #${index + 1} owner`, () => {
      it('should set recoveryHash for a single account', async () => {
        const singleOwner = [newOwners[0]];
        await ctx.multisig.startRecovery(singleOwner, { from: owner });

        assert.equal(
          await ctx.multisig.recoveryHash(),
          hashAddresses(singleOwner)
        );
      });

      it('should set recoveryHash for multiple accounts', async () => {
        await ctx.multisig.startRecovery(newOwners, { from: owner });

        assert.equal(
          await ctx.multisig.recoveryHash(),
          hashAddresses(newOwners)
        );
      });

      it('should set recoveryBlock to current block', async () => {
        await ctx.multisig.startRecovery(newOwners, { from: owner });

        assertNumberEqual(
          await ctx.multisig.recoveryBlock(),
          web3.eth.blockNumber
        );
      });

      it('should emit RecoveryStarted event', async () => {
        const trans = await ctx.multisig.startRecovery(newOwners, {
          from: owner
        });

        const log = findLastLog(trans, 'RecoveryStarted');
        const event: RecoveryStartedEvent = log.args;

        assert.equal(event.from, owner);
        assert.deepEqual(event.newOwners, newOwners);
      });
    });
  });
}

export function testCancelRecovery(
  ctx: MultisigTestContext<RecoverableMultisig>
) {
  const nonOwner = ctx.accounts[0];
  const newOwners = ctx.accounts.slice(6, 9);

  // preconditions
  beforeEach(async () => {
    assert.deepEqual(ctx.owners, await ctx.multisig.listOwners());
    assert.notInclude(ctx.owners, nonOwner);
    assert.notDeepEqual(newOwners, ctx.owners);
  });

  it('should revert when recovery not started', async () => {
    await assertReverts(async () => {
      await ctx.multisig.cancelRecovery({ from: ctx.owners[0] });
    });
  });

  context('When recovery started', () => {
    beforeEach(async () => {
      await ctx.multisig.startRecovery(newOwners, { from: ctx.owners[0] });
    });

    it('should revert when called by non-owner', async () => {
      await assertReverts(async () => {
        await ctx.multisig.cancelRecovery({ from: nonOwner });
      });
    });

    ctx.owners.map((owner, index) => {
      context(`When called by #${index + 1} owner`, () => {
        it('should reset recoveryHash', async () => {
          await ctx.multisig.cancelRecovery({ from: owner });

          assert.equal(
            await ctx.multisig.recoveryHash(),
            `0x${'0'.repeat(64)}`
          );
        });

        it('should reset recoveryBlock', async () => {
          await ctx.multisig.cancelRecovery({ from: owner });

          assertNumberEqual(await ctx.multisig.recoveryBlock(), 0);
        });

        it('should emit RecoveryCancelled event', async () => {
          const trans = await ctx.multisig.cancelRecovery({
            from: owner
          });

          const log = findLastLog(trans, 'RecoveryCancelled');
          const event: RecoveryCancelledEvent = log.args;

          assert.equal(event.from, owner);
        });
      });
    });
  });
}

export function testConfirmRecovery(
  ctx: MultisigTestContext<RecoverableMultisig>
) {
  const nonOwner = ctx.accounts[0];
  const newOwners = ctx.accounts.slice(6, 9);

  // preconditions
  beforeEach(async () => {
    assert.deepEqual(ctx.owners, await ctx.multisig.listOwners());
    assert.notInclude(ctx.owners, nonOwner);
    assert.notDeepEqual(newOwners, ctx.owners);
  });

  it('should revert when recovery not started', async () => {
    await assertReverts(async () => {
      await ctx.multisig.cancelRecovery({ from: ctx.owners[0] });
    });
  });

  context('When recovery started', () => {
    const waitUntilBlock = tempo(web3).waitUntilBlock;

    let recoveryPassingBlock: BigNumber;

    beforeEach(async () => {
      await ctx.multisig.startRecovery(newOwners, { from: ctx.owners[0] });

      recoveryPassingBlock = (await ctx.multisig.recoveryBlock()).add(
        await ctx.multisig.recoveryBlockOffset()
      );
    });

    it('should revert when recovery just started', async () => {
      await assertReverts(async () => {
        await ctx.multisig.confirmRecovery(newOwners, {
          from: ctx.owners[0]
        });
      });
    });

    it('should revert when recovery not passed', async () => {
      await waitUntilBlock(100, recoveryPassingBlock.div(2).toNumber());

      await assertReverts(async () => {
        await ctx.multisig.confirmRecovery(newOwners, {
          from: ctx.owners[0]
        });
      });
    });

    context('When recovery passed', () => {
      beforeEach(async () => {
        await waitUntilBlock(100, recoveryPassingBlock.toNumber());
      });

      it('should revert when called by non-owner', async () => {
        await assertReverts(async () => {
          await ctx.multisig.confirmRecovery(newOwners, { from: nonOwner });
        });
      });

      ctx.owners.map((owner, index) => {
        context(`When called by #${index + 1} owner`, () => {
          it('should change owners', async () => {
            await ctx.multisig.confirmRecovery(newOwners, { from: owner });

            assert.deepEqual(await ctx.multisig.listOwners(), newOwners);
          });

          it('should reset recoveryHash', async () => {
            await ctx.multisig.confirmRecovery(newOwners, { from: owner });

            assert.equal(
              await ctx.multisig.recoveryHash(),
              `0x${'0'.repeat(64)}`
            );
          });

          it('should reset recoveryBlock', async () => {
            await ctx.multisig.confirmRecovery(newOwners, { from: owner });

            assertNumberEqual(await ctx.multisig.recoveryBlock(), 0);
          });

          it('should emit RecoveryConfirmed event', async () => {
            const trans = await ctx.multisig.confirmRecovery(newOwners, {
              from: owner
            });

            const log = findLastLog(trans, 'RecoveryConfirmed');
            const event: RecoveryConfirmedEvent = log.args;

            assert.equal(event.from, owner);
            assert.deepEqual(event.newOwners, newOwners);
          });
        });
      });
    });
  });
}

function hashAddresses(addresses: Address[]): string {
  const str = addresses.reduce(
    (acc, owner) => acc.concat(toHex(owner, 64)),
    ''
  );
  return web3.sha3(str, { encoding: 'hex' });
}
