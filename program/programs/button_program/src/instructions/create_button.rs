use crate::*;
use anchor_lang::prelude::*;
use std::str::FromStr;

#[derive(Accounts)]
#[instruction(
    title: String,
    color: String,
    sound_uri: String,
)]
pub struct CreateButton<'info> {
    #[account(
        mut,
    )]
    pub fee_payer: Signer<'info>,

    #[account(
        init,
        // Calculate space dynamically:
        // 8 bytes (discriminator) + 
        // 4+title.len() (title length prefix + data) +
        // 4+color.len() (color length prefix + data) +
        // 32 bytes (creator pubkey) +
        // 4+sound_uri.len() (sound_uri length prefix + data) +
        // 8 bytes (number_of_likes u64)
        space = 8 + 4 + title.len() + 4 + color.len() + 32 + 4 + sound_uri.len() + 8,
        payer=fee_payer,
        seeds = [
            b"button",
            creator.key().as_ref(),
        ],
        bump,
    )]
    pub button: Account<'info, Button>,

    #[account(
        mut,
    )]
    pub creator: Signer<'info>,

    #[account(
        mut,
    )]
    /// CHECK: This account just receives SOL
    pub admin_wallet: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

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
pub fn handler(
    ctx: Context<CreateButton>,
    title: String,
    color: String,
    sound_uri: String,
) -> Result<()> {
    // Validate input lengths
    require!(title.len() <= 25, ErrorCode::InvalidInput);
    require!(color.len() <= 20, ErrorCode::InvalidInput);
    require!(sound_uri.len() <= 150, ErrorCode::InvalidInput);
    
    // Initialize the button account
    let button = &mut ctx.accounts.button;
    button.title = title;
    button.color = color;
    button.creator = ctx.accounts.creator.key();
    button.sound_uri = sound_uri;
    button.number_of_likes = 0;
    
    // Transfer the fee to the admin wallet (0.02 SOL = 20_000_000 lamports)
    let fee_amount = 20_000_000;
    
    // Check if the creator has enough funds
    require!(
        ctx.accounts.creator.lamports() >= fee_amount,
        ErrorCode::InsufficientFunds
    );
    
    // Transfer the fee
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.admin_wallet.to_account_info(),
            },
        ),
        fee_amount,
    )?;
    
    msg!("Button created successfully with a fee of 0.02 SOL");
    Ok(())
}