# Mithra Air Cool - Invoice Generator Web App

A clean, modern invoice generation web application built specifically for **Mithra Air Cool**.

## Features

- **Pixel-Perfect A4 Replica**: Recreates the visual identity, colors, typography, header gradient, wave accent, and bank details of the official Mithra Air Cool invoice.
- **Dynamic Auto-Adjusting Table**: Add, edit, or remove line items with automatic row adjustment and real-time total recalculation.
- **GST Options**:
  - **Without GST (0%)**: CGST and SGST show ₹0 (as in the sample invoice).
  - **With GST (18%)**: Calculates 9% CGST + 9% SGST automatically.
  - **Inter-State IGST (18%)**: Calculates 18% IGST for supply outside Tamil Nadu.
- **Auto Indian Currency to Words**: Automatically converts the grand total into Indian English words (e.g., *Seven thousand Six Hundred Fifty only*).
- **One-Click Print / PDF Export**: Optimized `@media print` layout for standard A4 printing and saving as PDF.
- **Auto-Save Drafts**: Saves edits to browser storage so your friend never loses progress.

## Deploying to GitHub Pages

1. Create a repository on GitHub (e.g. `mithra-air-cool-invoice`).
2. Push your code:
   ```bash
   git remote add origin https://github.com/dgr0ne/mithra-air-cool-invoice.git
   git push -u origin main
   ```
3. In your GitHub repository:
   - Go to **Settings** > **Pages** (on the left menu).
   - Under **Build and deployment** > **Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` and `/ (root)`.
   - Click **Save**.
4. Within 1–2 minutes, your live web app link will be ready at:
   `https://dgr0ne.github.io/mithra-air-cool-invoice/`
