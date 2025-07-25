import {
  AnchorProvider,
  BN,
  IdlAccounts,
  Program,
  web3,
} from "@coral-xyz/anchor";
import { MethodsBuilder } from "@coral-xyz/anchor/dist/cjs/program/namespace/methods";
import { ButtonProgram } from "../../target/types/button_program";
import idl from "../../target/idl/button_program.json";
import * as pda from "./pda";



let _program: Program<ButtonProgram>;


export const initializeClient = (
    programId: web3.PublicKey,
    anchorProvider = AnchorProvider.env(),
) => {
    _program = new Program<ButtonProgram>(
        idl as never,
        programId,
        anchorProvider,
    );


};

export type CreateButtonArgs = {
  feePayer: web3.PublicKey;
  creator: web3.PublicKey;
  adminWallet: web3.PublicKey;
  title: string;
  color: string;
  soundUri: string;
};

/**
 * ### Returns a {@link MethodsBuilder}
 * Creates a new button and transfers a fee to the admin wallet
 *
 * Accounts:
 * 0. `[writable, signer]` fee_payer: {@link PublicKey} 
 * 1. `[writable]` button: {@link Button} 
 * 2. `[writable, signer]` creator: {@link PublicKey} 
 * 3. `[writable]` admin_wallet: {@link PublicKey} 
 * 4. `[]` system_program: {@link PublicKey} Auto-generated, for account initialization
 *
 * Data:
 * - title: {@link string} The title of the button
 * - color: {@link string} The color of the button
 * - sound_uri: {@link string} URI to the sound that plays when button is pressed
 */
export const createButtonBuilder = (
	args: CreateButtonArgs,
	remainingAccounts: Array<web3.AccountMeta> = [],
): MethodsBuilder<ButtonProgram, never> => {
    const [buttonPubkey] = pda.deriveButtonPDA({
        creator: args.creator,
    }, _program.programId);

  return _program
    .methods
    .createButton(
      args.title,
      args.color,
      args.soundUri,
    )
    .accountsStrict({
      feePayer: args.feePayer,
      button: buttonPubkey,
      creator: args.creator,
      adminWallet: args.adminWallet,
      systemProgram: new web3.PublicKey("11111111111111111111111111111111"),
    })
    .remainingAccounts(remainingAccounts);
};

/**
 * ### Returns a {@link web3.TransactionInstruction}
 * Creates a new button and transfers a fee to the admin wallet
 *
 * Accounts:
 * 0. `[writable, signer]` fee_payer: {@link PublicKey} 
 * 1. `[writable]` button: {@link Button} 
 * 2. `[writable, signer]` creator: {@link PublicKey} 
 * 3. `[writable]` admin_wallet: {@link PublicKey} 
 * 4. `[]` system_program: {@link PublicKey} Auto-generated, for account initialization
 *
 * Data:
 * - title: {@link string} The title of the button
 * - color: {@link string} The color of the button
 * - sound_uri: {@link string} URI to the sound that plays when button is pressed
 */
export const createButton = (
	args: CreateButtonArgs,
	remainingAccounts: Array<web3.AccountMeta> = [],
): Promise<web3.TransactionInstruction> =>
    createButtonBuilder(args, remainingAccounts).instruction();

/**
 * ### Returns a {@link web3.TransactionSignature}
 * Creates a new button and transfers a fee to the admin wallet
 *
 * Accounts:
 * 0. `[writable, signer]` fee_payer: {@link PublicKey} 
 * 1. `[writable]` button: {@link Button} 
 * 2. `[writable, signer]` creator: {@link PublicKey} 
 * 3. `[writable]` admin_wallet: {@link PublicKey} 
 * 4. `[]` system_program: {@link PublicKey} Auto-generated, for account initialization
 *
 * Data:
 * - title: {@link string} The title of the button
 * - color: {@link string} The color of the button
 * - sound_uri: {@link string} URI to the sound that plays when button is pressed
 */
export const createButtonSendAndConfirm = async (
  args: Omit<CreateButtonArgs, "feePayer" | "creator"> & {
    signers: {
      feePayer: web3.Signer,
      creator: web3.Signer,
    },
  },
  remainingAccounts: Array<web3.AccountMeta> = [],
): Promise<web3.TransactionSignature> => {
  const preInstructions: Array<web3.TransactionInstruction> = [];


  return createButtonBuilder({
      ...args,
      feePayer: args.signers.feePayer.publicKey,
      creator: args.signers.creator.publicKey,
    }, remainingAccounts)
    .preInstructions(preInstructions)
    .signers([args.signers.feePayer, args.signers.creator])
    .rpc();
}

export type LikeButtonArgs = {
  feePayer: web3.PublicKey;
  user: web3.PublicKey;
  creator: web3.PublicKey;
};

/**
 * ### Returns a {@link MethodsBuilder}
 * Likes a button and increments its like counter
 *
 * Accounts:
 * 0. `[writable, signer]` fee_payer: {@link PublicKey} 
 * 1. `[writable]` button: {@link Button} 
 * 2. `[writable]` like: {@link PublicKey} 
 * 3. `[writable, signer]` user: {@link PublicKey} 
 * 4. `[]` creator: {@link PublicKey} 
 * 5. `[]` system_program: {@link PublicKey} Auto-generated, for account initialization
 */
export const likeButtonBuilder = (
	args: LikeButtonArgs,
	remainingAccounts: Array<web3.AccountMeta> = [],
): MethodsBuilder<ButtonProgram, never> => {
    const [buttonPubkey] = pda.deriveButtonPDA({
        creator: args.creator,
    }, _program.programId);
    const [likePubkey] = pda.deriveLikePDA({
        button: args.button,
        user: args.user,
    }, _program.programId);

  return _program
    .methods
    .likeButton(

    )
    .accountsStrict({
      feePayer: args.feePayer,
      button: buttonPubkey,
      like: likePubkey,
      user: args.user,
      creator: args.creator,
      systemProgram: new web3.PublicKey("11111111111111111111111111111111"),
    })
    .remainingAccounts(remainingAccounts);
};

/**
 * ### Returns a {@link web3.TransactionInstruction}
 * Likes a button and increments its like counter
 *
 * Accounts:
 * 0. `[writable, signer]` fee_payer: {@link PublicKey} 
 * 1. `[writable]` button: {@link Button} 
 * 2. `[writable]` like: {@link PublicKey} 
 * 3. `[writable, signer]` user: {@link PublicKey} 
 * 4. `[]` creator: {@link PublicKey} 
 * 5. `[]` system_program: {@link PublicKey} Auto-generated, for account initialization
 */
export const likeButton = (
	args: LikeButtonArgs,
	remainingAccounts: Array<web3.AccountMeta> = [],
): Promise<web3.TransactionInstruction> =>
    likeButtonBuilder(args, remainingAccounts).instruction();

/**
 * ### Returns a {@link web3.TransactionSignature}
 * Likes a button and increments its like counter
 *
 * Accounts:
 * 0. `[writable, signer]` fee_payer: {@link PublicKey} 
 * 1. `[writable]` button: {@link Button} 
 * 2. `[writable]` like: {@link PublicKey} 
 * 3. `[writable, signer]` user: {@link PublicKey} 
 * 4. `[]` creator: {@link PublicKey} 
 * 5. `[]` system_program: {@link PublicKey} Auto-generated, for account initialization
 */
export const likeButtonSendAndConfirm = async (
  args: Omit<LikeButtonArgs, "feePayer" | "user"> & {
    signers: {
      feePayer: web3.Signer,
      user: web3.Signer,
    },
  },
  remainingAccounts: Array<web3.AccountMeta> = [],
): Promise<web3.TransactionSignature> => {
  const preInstructions: Array<web3.TransactionInstruction> = [];


  return likeButtonBuilder({
      ...args,
      feePayer: args.signers.feePayer.publicKey,
      user: args.signers.user.publicKey,
    }, remainingAccounts)
    .preInstructions(preInstructions)
    .signers([args.signers.feePayer, args.signers.user])
    .rpc();
}

// Getters

export const getButton = (
    publicKey: web3.PublicKey,
    commitment?: web3.Commitment
): Promise<IdlAccounts<ButtonProgram>["button"]> => _program.account.button.fetch(publicKey, commitment);
