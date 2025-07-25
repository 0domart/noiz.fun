use {
	button_program::{
			entry,
			ID as PROGRAM_ID,
	},
	solana_sdk::{
		entrypoint::{ProcessInstruction, ProgramResult},
		pubkey::Pubkey,
	},
	anchor_lang::prelude::AccountInfo,
	solana_program_test::*,
};

// Type alias for the entry function pointer used to convert the entry function into a ProcessInstruction function pointer.
pub type ProgramEntry = for<'info> fn(
	program_id: &Pubkey,
	accounts: &'info [AccountInfo<'info>],
	instruction_data: &[u8],
) -> ProgramResult;

// Macro to convert the entry function into a ProcessInstruction function pointer.
#[macro_export]
macro_rules! convert_entry {
	($entry:expr) => {
		// Use unsafe block to perform memory transmutation.
		unsafe { core::mem::transmute::<ProgramEntry, ProcessInstruction>($entry) }
	};
}

pub fn get_program_test() -> ProgramTest {
	let program_test = ProgramTest::new(
		"button_program",
		PROGRAM_ID,
		processor!(convert_entry!(entry)),
	);
	program_test
}
	
pub mod button_program_ix_interface {

	use {
		solana_sdk::{
			hash::Hash,
			signature::{Keypair, Signer},
			instruction::Instruction,
			pubkey::Pubkey,
			transaction::Transaction,
		},
		button_program::{
			ID as PROGRAM_ID,
			accounts as button_program_accounts,
			instruction as button_program_instruction,
		},
		anchor_lang::{
			prelude::*,
			InstructionData,
		}
	};

	pub fn create_button_ix_setup(
		fee_payer: &Keypair,
		button: Pubkey,
		creator: &Keypair,
		admin_wallet: Pubkey,
		system_program: Pubkey,
		title: &String,
		color: &String,
		sound_uri: &String,
		recent_blockhash: Hash,
	) -> Transaction {
		let accounts = button_program_accounts::CreateButton {
			fee_payer: fee_payer.pubkey(),
			button: button,
			creator: creator.pubkey(),
			admin_wallet: admin_wallet,
			system_program: system_program,
		};

		let data = 	button_program_instruction::CreateButton {
				title: title.clone(),
				color: color.clone(),
				sound_uri: sound_uri.clone(),
		};		let instruction = Instruction::new_with_bytes(PROGRAM_ID, &data.data(), accounts.to_account_metas(None));
		let mut transaction = Transaction::new_with_payer(
			&[instruction], 
			Some(&fee_payer.pubkey()),
		);

		transaction.sign(&[
			&fee_payer,
			&creator,
		], recent_blockhash);

		return transaction;
	}

	pub fn like_button_ix_setup(
		fee_payer: &Keypair,
		button: Pubkey,
		like: Pubkey,
		user: &Keypair,
		creator: Pubkey,
		system_program: Pubkey,
		recent_blockhash: Hash,
	) -> Transaction {
		let accounts = button_program_accounts::LikeButton {
			fee_payer: fee_payer.pubkey(),
			button: button,
			like: like,
			user: user.pubkey(),
			creator: creator,
			system_program: system_program,
		};

		let data = button_program_instruction::LikeButton;
		let instruction = Instruction::new_with_bytes(PROGRAM_ID, &data.data(), accounts.to_account_metas(None));
		let mut transaction = Transaction::new_with_payer(
			&[instruction], 
			Some(&fee_payer.pubkey()),
		);

		transaction.sign(&[
			&fee_payer,
			&user,
		], recent_blockhash);

		return transaction;
	}

}
