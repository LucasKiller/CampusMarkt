# Password Entry Usability Design

- Use a shared password input wrapper with a per-field Show/Hide button. Preserve each input's ID, name, autocomplete, error relationship, and controlled value.
- Place registration confirmation after the primary password. Clear both fields on validation/API/network failure; send only `password` in the existing request body.
- Show three short milestones: 10 characters required, 14 characters recommended, and 20 characters for a longer passphrase. The progress bar changes with the entered character count; text and check state convey progress without relying on color alone. Explain that length is only one factor and encourage unique passwords.
- Use the existing form tokens and responsive layout. Do not introduce new server policy or dependency.
