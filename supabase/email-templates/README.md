# Everyday Pulse Email Templates

Use `confirm-signup.html` in Supabase:

1. Open Supabase Dashboard.
2. Go to Authentication > Email Templates.
3. Open "Confirm signup".
4. Set subject to: `Confirm your Everyday Pulse account`
5. Paste the HTML from `confirm-signup.html`.

Important: email clients cannot load images from `localhost`.

The template uses:

```html
{{ .SiteURL }}/everyday-pulse-thumbnail.png
```

So before production testing, set Supabase Auth > URL Configuration > Site URL to your deployed app URL, for example:

```text
https://your-domain.com
```

If you want to test email images before deploying the app, upload `public/everyday-pulse-thumbnail.png` to a public Supabase Storage bucket and replace the image `src` in the template with that public URL.
