
use anchor_lang::prelude::*;

#[account]
pub struct Button {
	pub title: String,
	pub color: String,
	pub creator: Pubkey,
	pub sound_uri: String,
	pub number_of_likes: u64,
}
