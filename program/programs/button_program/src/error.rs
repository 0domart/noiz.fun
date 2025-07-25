// This file is auto-generated from the CIDL source.
// Editing this file directly is not recommended as it may be overwritten.
//
// Docs: https://docs.codigo.ai/c%C3%B3digo-interface-description-language/specification#errors

use anchor_lang::prelude::*;

#[error_code]
pub enum ButtonProgramError {
    #[msg("The user does not have enough funds to create a button")]
    InsufficientFunds,
    #[msg("The user has already liked this button")]
    AlreadyLiked,
    #[msg("Invalid input parameters")]
    InvalidInput,
    #[msg("Arithmetic overflow")]
    Overflow,
}