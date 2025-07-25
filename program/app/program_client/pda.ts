import {PublicKey} from "@solana/web3.js";
import {BN} from "@coral-xyz/anchor";

export type ButtonSeeds = {
    creator: PublicKey, 
};

export const deriveButtonPDA = (
    seeds: ButtonSeeds,
    programId: PublicKey
): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("button"),
            seeds.creator.toBuffer(),
        ],
        programId,
    )
};

export type LikeSeeds = {
    button: PublicKey, 
    user: PublicKey, 
};

export const deriveLikePDA = (
    seeds: LikeSeeds,
    programId: PublicKey
): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("like"),
            seeds.button.toBuffer(),
            seeds.user.toBuffer(),
        ],
        programId,
    )
};

