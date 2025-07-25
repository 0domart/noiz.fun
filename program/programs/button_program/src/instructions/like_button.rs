use crate::*;
use anchor_lang::prelude::*;
use std::str::FromStr;

#[derive(Accounts)]
pub struct LikeButton<'info> {
    #[account(
        mut,
        seeds = [
            b"button",
            creator.key().as_ref(),
        ],
        bump,
    )]
    pub button: Account<'info, Button>,

    #[account(
        init,
        space=8, // Only need discriminator space since we're not storing any data
        payer=user,
        seeds = [
            b"like",
            button.key().as_ref(),
            user.key().as_ref(),
        ],
        bump,
    )]
    /// CHECK: This is just a PDA to track likes
    pub like: UncheckedAccount<'info>,

    #[account(
        mut,
    )]
    pub user: Signer<'info>,

    /// CHECK: Only used for PDA derivation
    pub creator: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
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
pub fn handler(
    ctx: Context<LikeButton>,
) -> Result<()> {
    // Increment the like counter
    let button = &mut ctx.accounts.button;
    button.number_of_likes = button.number_of_likes.checked_add(1)
        .ok_or(ErrorCode::Overflow)?;
    
    msg!("Button liked successfully! Total likes: {}", button.number_of_likes);
    Ok(())
}