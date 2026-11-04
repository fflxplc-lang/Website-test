FINOWISE WEBSITE — UPDATED BUILD (correction tracker applied)
==============================================================

How to publish on Vercel (2 minutes, no coding):

  OPTION A — Drag & drop
    1. Go to https://vercel.com/new
    2. Drag this whole folder (or the zip) onto the page.
    3. Vercel detects it as a static site and gives you the live link.

  OPTION B — Replace your existing finowise-site project
    1. Open https://vercel.com  → your finowise-site project.
    2. (If using GitHub) commit these files to the connected repo and push.
    3. Otherwise use "Deploy" → drag & drop, or vercel --prod from this folder.

What was corrected in this build
--------------------------------
  1.  Homepage taglines unified to the approved brand line:
      "Educating, Inspiring and Transforming Money Behaviour for Lasting Financial Wellness."
  2.  Footer ARN line: expired validity date removed; now reads
      "Current validity of ARN — Renewed as per AMFI records".
      >>> To show the exact date, replace that phrase in every .html file
          with e.g. "Current validity of ARN — 07 Feb 2029".
  3.  About Us → "United by a Shared Vision": Manish Singh, CFP® added to the
      story and featured with his full profile + leadership photo rail added.
  4.  Shreedevi's designation standardised to "IRDA Insurance Advisor".
  5.  All internal links swept and verified; Words-of-Wisdom label case fixed;
      cookie-banner privacy link fixed on subpages.
  6.  Mission & Vision section restyled: larger, bold, brand colour.
  7.  Pune office address updated to: Office No. 202, 2nd Floor, Turning Point 2,
      Above Irani Cafe, Opposite Rosary School, Viman Nagar, Pune.
  8.  Contact form: if the CRM server is unreachable, the enquiry now hands
      over to WhatsApp automatically so no lead is lost.
  9.  Estate Planning page copy updated to the approved wording.

  10. Product pages updated from "Products List for Website" (Word doc):
      Mutual Funds, PMS / Stock Baskets, AIF, Fixed Income, Insurance,
      Loans (Estate Planning already matched) — new tagline in the page
      banner, new description as the intro paragraph, SEO description
      refreshed; Solutions page product cards now show the same taglines.

Files are plain HTML/CSS/JS — host anywhere as a static site.
