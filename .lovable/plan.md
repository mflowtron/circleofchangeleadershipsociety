
# Beautiful Branded Email Template for Access Code

## Overview

Transform the plain access code email into a premium, beautifully branded email that reflects Circle of Change's golden/charcoal design system. The email will feature the logo, elegant styling, and a professional appearance that instills confidence.

## Current State

The existing email template is very basic with minimal styling:
- Generic gray background
- Plain text formatting
- No branding or logo
- No visual hierarchy

## Design Approach

### Brand Colors (from index.css)
| Element | Color | Hex |
|---------|-------|-----|
| Primary Gold | Rich Gold | #D4A84B |
| Dark Gold | Accent | #B8923F |
| Background Dark | Charcoal | #1A1814 |
| Text Dark | Near Black | #1F1C18 |
| Text Muted | Warm Gray | #6B6560 |
| Background Light | Warm Cream | #FAF9F7 |

### Email Structure

```text
+------------------------------------------+
|          [Logo - Circle of Change]        |
+------------------------------------------+
|                                          |
|        Your Access Code                   |
|        (warm greeting message)            |
|                                          |
|   +----------------------------------+   |
|   |                                  |   |
|   |    [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ] [ 6 ]   |
|   |                                  |   |
|   +----------------------------------+   |
|                                          |
|        Expires in 10 minutes             |
|                                          |
+------------------------------------------+
|                                          |
|         Footer with security note         |
|         © Circle of Change                |
|                                          |
+------------------------------------------+
```

## Technical Implementation

### File to Modify
`supabase/functions/send-order-access-code/index.ts`

### Key Features

1. **Header with Logo**
   - Use published URL to reference the emblem logo
   - Golden gradient background for header section
   - Clean typography

2. **Access Code Display**
   - Large, spaced digits for easy reading
   - Individual boxes for each digit (like OTP inputs)
   - Golden accent borders
   - High contrast for accessibility

3. **Body Content**
   - Personalized greeting
   - Clear instructions
   - Countdown/expiry notice
   - Warm, professional tone

4. **Footer**
   - Security notice
   - Brand copyright
   - Subtle styling

5. **Email-Safe CSS**
   - Inline styles only (email client compatibility)
   - Table-based layout for consistency
   - Fallback fonts
   - MSO-specific fixes for Outlook

### Email Template Design

The template will use:
- **Background**: Subtle warm cream (#FAF9F7) for body
- **Card**: White card with soft shadow
- **Header**: Dark charcoal gradient with golden accent
- **Code Section**: Individual digit boxes with golden borders
- **Typography**: System fonts with fallbacks
- **Responsive**: Scales well on mobile devices

## Code Changes

Update the HTML email template with:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#FAF9F7; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Main Container -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F7; padding:40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Email Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#FFFFFF; border-radius:16px; box-shadow:0 4px 24px rgba(30,20,15,0.08); overflow:hidden;">
          
          <!-- Golden Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1A1814 0%, #2A2520 100%); padding:32px 40px; text-align:center;">
              <img src="[LOGO_URL]" alt="Circle of Change" width="180" style="display:block; margin:0 auto;">
            </td>
          </tr>
          
          <!-- Content Section -->
          <tr>
            <td style="padding:40px;">
              
              <!-- Greeting -->
              <h1 style="margin:0 0 8px; font-size:24px; font-weight:600; color:#1F1C18; text-align:center;">
                Your Access Code
              </h1>
              <p style="margin:0 0 32px; font-size:15px; color:#6B6560; text-align:center; line-height:1.6;">
                Enter this code to securely access your event tickets and orders.
              </p>
              
              <!-- Code Display -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td align="center">
                    <div style="display:inline-block; background:linear-gradient(180deg, #FEFEFE 0%, #FAF9F7 100%); border:2px solid #D4A84B; border-radius:12px; padding:20px 32px;">
                      <span style="font-size:36px; font-weight:700; letter-spacing:12px; color:#1A1814; font-family:'Courier New', monospace;">
                        ${code}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Expiry Notice -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-block; background:#FEF9F0; border-radius:8px; padding:12px 20px;">
                      <span style="font-size:13px; color:#B8923F; font-weight:500;">
                        ⏱ This code expires in 10 minutes
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#FAF9F7; padding:24px 40px; border-top:1px solid #EAE7E3;">
              <p style="margin:0 0 8px; font-size:13px; color:#6B6560; text-align:center; line-height:1.5;">
                If you didn't request this code, you can safely ignore this email.
              </p>
              <p style="margin:0; font-size:12px; color:#9A958F; text-align:center;">
                © 2026 Circle of Change Leadership Society
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
```

## Implementation Notes

1. **Logo Hosting**: Use the published URL to reference the logo emblem at `https://circleofchangeleadershipsociety.lovable.app/coclc-logo-emblem.png`

2. **Email Client Compatibility**:
   - All styles are inline
   - Table-based layout for Outlook
   - Fallback system fonts
   - Max-width with responsive padding

3. **Accessibility**:
   - High contrast code display
   - Clear hierarchy
   - Readable font sizes

4. **Mobile Responsive**:
   - Fluid width with max-width
   - Adequate touch targets
   - Readable on small screens
