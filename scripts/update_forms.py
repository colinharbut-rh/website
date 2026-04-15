#!/usr/bin/env python3
"""
Update Webflow popup forms to Formspree in specified HTML files.
"""
import re
import os

BASE = "E:/Share/projects/Webthrive/reportinghub"

# Files to process: (relative_path, is_root_level)
FILES = [
    ("index.html", True),
    ("detail_resources.html", True),
    ("resources/the-definitive-guide-to-power-bi-embedded.html", False),
    ("resources/ai-in-bi-adoption-curve.html", False),
    ("resources/bahler-management-reporting-hub.html", False),
    ("resources/bi-genius-from-reporting-hub.html", False),
    ("resources/bi-genius-product-demo-white-label-ai-agents-for-power-bi.html", False),
    ("resources/galatea-technologies.html", False),
    ("resources/licensing-cost-comparison.html", False),
    ("resources/microsoft-fabric-reporting-hub-webinar-modernize-your-bi-strategy.html", False),
    ("resources/optimizing-your-semantic-model-for-ai.html", False),
    ("resources/power-bi-embedded-licensing-explained.html", False),
    ("resources/reporting-hub---white-label-power-bi-portal.html", False),
    ("resources/reporting-hub-datasheet.html", False),
    ("resources/reporting-hub-explained---product-overview.html", False),
    ("resources/reporting-hub-overview.html", False),
    ("resources/sharing-power-bi-externally.html", False),
    ("resources/the-importance-of-properly-configuring-your-semantic-model-for-ai-powered-insights.html", False),
    ("resources/unlock-revenue-potential-how-to-productize-and-monetize-your-power-bi-assets.html", False),
    ("resources/unlock-revenue-potential-how-to-productize-and-monetize-your-power-bi-assets-ug.html", False),
    ("resources/white-label-ai-agents-for-power-bi.html", False),
    ("resources/why-you-should-care-about-power-bi-embedded.html", False),
    ("resources/why-your-organization-should-use-a-white-label-power-bi-platform.html", False),
    ("lp/stop-paying-per-user-fees.html", False),
    ("blog.html", True),
]

FORMSPREE_ACTION = 'https://formspree.io/f/xvzvbpyd'


def update_popup_form(tag, confirm_url):
    """
    Update a wf-form-Download-Popup-Form opening tag:
    - method="get" -> method="POST"
    - Add action="..."
    - Remove data-wf-page-id, data-wf-element-id, data-name
    - Remove redirect, data-redirect attrs
    Returns updated tag string.
    """
    # Remove data-wf-page-id="..."
    tag = re.sub(r'\s*data-wf-page-id="[^"]*"', '', tag)
    # Remove data-wf-element-id="..."
    tag = re.sub(r'\s*data-wf-element-id="[^"]*"', '', tag)
    # Remove data-name="..."
    tag = re.sub(r'\s*data-name="[^"]*"', '', tag)
    # Remove redirect="..." (if present)
    tag = re.sub(r'\s*redirect="[^"]*"', '', tag)
    # Remove data-redirect="..." (if present)
    tag = re.sub(r'\s*data-redirect="[^"]*"', '', tag)
    # Change method="get" to method="POST"
    tag = re.sub(r'\bmethod="get"', 'method="POST"', tag, flags=re.IGNORECASE)
    # Add action after method="POST"
    tag = re.sub(r'(method="POST")', r'\1 action="' + FORMSPREE_ACTION + '"', tag)
    return tag


def update_email_form(tag, pdf_url):
    """
    Update an email-form opening tag that has a redirect attr with a PDF URL.
    - method="get" -> method="POST"
    - Add action="..."
    - Remove data-wf-page-id, data-wf-element-id, data-name, redirect, data-redirect
    Returns updated tag string.
    """
    # Remove data-wf-page-id="..."
    tag = re.sub(r'\s*data-wf-page-id="[^"]*"', '', tag)
    # Remove data-wf-element-id="..."
    tag = re.sub(r'\s*data-wf-element-id="[^"]*"', '', tag)
    # Remove data-name="..."
    tag = re.sub(r'\s*data-name="[^"]*"', '', tag)
    # Remove redirect="..."
    tag = re.sub(r'\s*redirect="[^"]*"', '', tag)
    # Remove data-redirect="..."
    tag = re.sub(r'\s*data-redirect="[^"]*"', '', tag)
    # Change method="get" to method="POST"
    tag = re.sub(r'\bmethod="get"', 'method="POST"', tag, flags=re.IGNORECASE)
    # Add action after method="POST"
    tag = re.sub(r'(method="POST")', r'\1 action="' + FORMSPREE_ACTION + '"', tag)
    return tag


def process_file(rel_path, is_root):
    full_path = os.path.join(BASE, rel_path)
    if not os.path.exists(full_path):
        print(f"SKIP (not found): {rel_path}")
        return

    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    confirm_url = 'confirm.html' if is_root else '../confirm.html'
    hidden_next_confirm = f'<input type="hidden" name="_next" value="{confirm_url}">'

    popup_count = 0
    email_form_count = 0

    # --- Process wf-form-Download-Popup-Form ---
    # Match the full opening tag of the popup form
    def replace_popup_form(m):
        nonlocal popup_count
        popup_count += 1
        original_tag = m.group(0)
        # Extract redirect URL if present (for index.html's popup form)
        redirect_match = re.search(r'\bredirect="([^"]*)"', original_tag)
        if redirect_match:
            pdf_url = redirect_match.group(1)
            hidden = f'<input type="hidden" name="_next" value="{pdf_url}">'
        else:
            hidden = hidden_next_confirm
        updated_tag = update_popup_form(original_tag)
        return updated_tag + hidden

    # Match opening form tag for popup form (ends with >)
    popup_pattern = re.compile(
        r'<form\s[^>]*id="wf-form-Download-Popup-Form"[^>]*>',
        re.DOTALL
    )
    content = popup_pattern.sub(replace_popup_form, content)

    # --- Process email-form with redirect attr (PDF URL) ---
    # Only update if email-form has a redirect attribute
    email_pattern = re.compile(
        r'<form\s[^>]*id="email-form"[^>]*redirect="([^"]*)"[^>]*>',
        re.DOTALL
    )

    def replace_email_form(m):
        nonlocal email_form_count
        email_form_count += 1
        original_tag = m.group(0)
        pdf_url = m.group(1)
        hidden = f'<input type="hidden" name="_next" value="{pdf_url}">'
        updated_tag = update_email_form(original_tag)
        return updated_tag + hidden

    content = email_pattern.sub(replace_email_form, content)

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"DONE: {rel_path} | popup_forms={popup_count} | email_forms_with_redirect={email_form_count}")


if __name__ == '__main__':
    for rel_path, is_root in FILES:
        process_file(rel_path, is_root)
    print("\nAll files processed.")
