pub mod common;

use std::str::FromStr;
use {
    common::{
		get_program_test,
		button_program_ix_interface,
	},
    solana_program_test::tokio,
    solana_sdk::{
        account::Account, pubkey::Pubkey, rent::Rent, signature::Keypair, signer::Signer, system_program,
    },
};


#[tokio::test]
async fn like_button_ix_success() {
	let mut program_test = get_program_test();

	// PROGRAMS
	program_test.prefer_bpf(true);

	program_test.add_program(
		"account_compression",
		Pubkey::from_str("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK").unwrap(),
		None,
	);

	program_test.add_program(
		"noop",
		Pubkey::from_str("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV").unwrap(),
		None,
	);

	// KEYPAIR
	let fee_payer_keypair = Keypair::new();
	let user_keypair = Keypair::new();

	// PUBKEY
	let fee_payer_pubkey = fee_payer_keypair.pubkey();
	let user_pubkey = user_keypair.pubkey();
	let creator_pubkey = Pubkey::new_unique();

	// EXECUTABLE PUBKEY
	let system_program_pubkey = Pubkey::from_str("11111111111111111111111111111111").unwrap();

	// PDA
	let (button_pda, _button_pda_bump) = Pubkey::find_program_address(
		&[
			b"button",
			creator_pubkey.as_ref(),
		],
		&button_program::ID,
	);

	let (like_pda, _like_pda_bump) = Pubkey::find_program_address(
		&[
			b"like",
			button_pubkey.as_ref(),
			user_pubkey.as_ref(),
		],
		&button_program::ID,
	);

	// ACCOUNT PROGRAM TEST SETUP
	program_test.add_account(
		fee_payer_pubkey,
		Account {
			lamports: 1_000_000_000_000,
			data: vec![],
			owner: system_program::ID,
			executable: false,
			rent_epoch: 0,
		},
	);

	program_test.add_account(
		user_pubkey,
		Account {
			lamports: 1_000_000_000_000,
			data: vec![],
			owner: system_program::ID,
			executable: false,
			rent_epoch: 0,
		},
	);

	// INSTRUCTIONS
	let (mut banks_client, _, recent_blockhash) = program_test.start().await;

	let ix = button_program_ix_interface::like_button_ix_setup(
		&fee_payer_keypair,
		button_pda,
		like_pda,
		&user_keypair,
		creator_pubkey,
		system_program_pubkey,
		recent_blockhash,
	);

	let result = banks_client.process_transaction(ix).await;

	// ASSERTIONS
	assert!(result.is_ok());

}
