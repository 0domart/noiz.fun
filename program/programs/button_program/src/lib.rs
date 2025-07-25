pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use std::str::FromStr;

pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;

declare_id!("4gp48UbcjNvWP9iqVL5WJ2Aj1g3jy1zLanjRvRx9JHXS");

#[program]
pub mod button_program {
    use super::*;

/// Creates a new button and transfers a fee to the admin wallet
///
/// Accounts:
/// 0. `[writable, signer]` fee_payer: [AccountInfo] 
/// 1. `[writable]` button: [Button] 
/// 2. `[writable, signer]` creator: [AccountInfo] 
/// 3. `[writable]` admin_wallet: [AccountInfo] 
/// 4. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
///
/// Data:
/// - title: [String] The title of the button
/// - color: [String] The color of the button
/// - sound_uri: [String] URI to the sound that plays when button is pressed
    pub fn create_button(ctx: Context<CreateButton>, title: String, color: String, sound_uri: String) -> Result<()> {
        create_button::handler(ctx, title, color, sound_uri)
    }

/// Likes a button and increments its like counter
///
/// Accounts:
/// 0. `[writable, signer]` fee_payer: [AccountInfo] 
/// 1. `[writable]` button: [Button] 
/// 2. `[writable]` like: [AccountInfo] 
/// 3. `[writable, signer]` user: [AccountInfo] 
/// 4. `[]` creator: [AccountInfo] 
/// 5. `[]` system_program: [AccountInfo] Auto-generated, for account initialization
    pub fn like_button(ctx: Context<LikeButton>) -> Result<()> {
        like_button::handler(ctx)
    }
}