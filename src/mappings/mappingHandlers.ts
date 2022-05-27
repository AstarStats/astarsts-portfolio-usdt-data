import { Transfer, Wallet } from "../types";

import {
    Transaction,
} from '../types/interfaces';

import { MoonbeamCall, MoonbeamEvent } from '@subql/contract-processors/dist/moonbeam';
import { BigNumber } from '@ethersproject/bignumber';

type TransferEventArgs = [string, string, BigNumber] & { from: string; to: string; value: BigNumber; };


/**
 * 
 * @param event USDC Transfer event
 * @returns
 */
export async function handleERC20Transfer(event: MoonbeamEvent<TransferEventArgs>): Promise<void> {

    const _from = await extractEventAsWalletAsset(
        event.args.from, -event.args.value.toBigInt(), event.blockTimestamp, event.transactionHash
    );

    const _to = await extractEventAsWalletAsset(
        event.args.to, event.args.value.toBigInt(), event.blockTimestamp, event.transactionHash
    );

    const transfer = Transfer.create({
        amount: event.args.value.toBigInt(),
        from: event.args.from,
        to: event.args.to,
        contractAddress: event.address,
        blockNumber: BigInt(event.blockNumber),
        id: event.transactionHash,
    });

    
    await Promise.all(
        [
            await transfer.save(),
            await _from.save(),
            await _to.save(),
        ]
    );
}

/**
 * 
 * @param _walletID wallet ID
 * @param _value transfer asset amount
 * @param _timestamp block timestamp
 * @param txhash transaction hash
 * @returns wallet entity
 */
async function extractEventAsWalletAsset(_walletID: string, _value: bigint, _timestamp: Date, txhash: string): Promise<Wallet>{
    let entity = new Wallet(_walletID);
    entity = await Wallet.get(_walletID);
    if (undefined === entity){
        //  {_walletID} is not registerd at database
        entity = createWallet(_walletID);
    }

    let _amountOfFrom = BigInt(0);
    if(0 < entity.transaction.length){
        _amountOfFrom = BigInt(entity.transaction[entity.transaction.length - 1].amount);
    }
    entity.transaction.push({
        amount: (_amountOfFrom + _value).toString(),
        timestamp : _timestamp,
        txhash : txhash
    } as Transaction);

    return entity;
}


/**
 * 
 * @param accountID  key of new entity
 * @returns new entity
 */
function createWallet(accountID: string) :Wallet{
    const entity = new Wallet(accountID);
    entity.transaction = [];
    
    return entity
}
