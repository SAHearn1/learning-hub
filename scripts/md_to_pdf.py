#!/usr/bin/env python3
"""Convert the production readiness markdown to a styled PDF."""

import markdown
from weasyprint import HTML

MD_PATH = "/home/user/learning-hub/PRODUCTION_READINESS.md"
PDF_PATH = "/home/user/learning-hub/PRODUCTION_READINESS.pdf"

with open(MD_PATH, "r") as f:
    md_text = f.read()

html_body = markdown.markdown(md_text, extensions=["tables", "fenced_code"])

full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{
    size: letter;
    margin: 0.75in 0.85in;
    @bottom-center {{
      content: "Page " counter(page) " of " counter(pages);
      font-size: 9px;
      color: #888;
    }}
  }}
  body {{
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    color: #1a1a1a;
  }}
  h1 {{
    font-size: 22pt;
    color: #1e3a5f;
    border-bottom: 3px solid #1e3a5f;
    padding-bottom: 8px;
    margin-top: 0;
  }}
  h2 {{
    font-size: 15pt;
    color: #1e3a5f;
    margin-top: 28px;
    border-bottom: 1px solid #ccd6e0;
    padding-bottom: 4px;
  }}
  h3 {{
    font-size: 12pt;
    color: #2c5282;
    margin-top: 18px;
  }}
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 10pt;
  }}
  th {{
    background-color: #1e3a5f;
    color: white;
    padding: 7px 10px;
    text-align: left;
    font-weight: 600;
  }}
  td {{
    padding: 6px 10px;
    border-bottom: 1px solid #dde3ea;
  }}
  tr:nth-child(even) td {{
    background-color: #f4f7fa;
  }}
  strong {{
    color: #1a1a1a;
  }}
  code {{
    background-color: #f0f3f7;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 9.5pt;
    font-family: "Courier New", monospace;
  }}
  ul, ol {{
    margin: 8px 0;
    padding-left: 22px;
  }}
  li {{
    margin-bottom: 4px;
  }}
  hr {{
    border: none;
    border-top: 1px solid #ccd6e0;
    margin: 24px 0;
  }}
  p {{
    margin: 8px 0;
  }}
  em {{
    color: #555;
  }}
</style>
</head>
<body>
{html_body}
</body>
</html>"""

HTML(string=full_html).write_pdf(PDF_PATH)
print(f"PDF written to {PDF_PATH}")
