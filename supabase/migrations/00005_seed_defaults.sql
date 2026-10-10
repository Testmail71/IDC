-- ============================================================================
-- ISKCON Disciples Course (IDC) Portal - 0005: default configuration seed
-- Safe defaults. Admin can change everything from the Settings page.
-- ============================================================================

-- Active IDC course (the only course this portal manages).
insert into public.courses (code, name, description, total_classes)
values (
  'IDC',
  'ISKCON Disciples Course',
  'Structured study of the guru-disciple relationship and initiation principles within ISKCON.',
  12
)
on conflict (code) do nothing;

-- Default portal settings (jsonb key -> value). Update values as needed.
insert into public.portal_settings (key, value) values
  ('temple_name', '"ISKCON Temple"'),
  ('idc_center_name', '"ISKCON Disciples Course Department"'),
  ('logo_path', '""'),
  ('contact_email', '"idc@example.org"'),
  ('contact_phone', '"+91 00000 00000"'),
  ('contact_address', '"ISKCON Temple, India"'),
  ('public_disclose_student_name', 'true'),
  ('require_payment_before_certificate', 'true'),
  ('allow_exam_without_completion', 'false'),
  ('student_photo_limit_mb', '2'),
  ('exam_sheet_limit_mb', '10'),
  ('certificate_limit_mb', '5'),
  ('registration_open', 'true'),
  ('homepage_intro', '"The ISKCON Disciples Course (IDC) is a structured study programme for devotees who wish to deepen their understanding of the guru-disciple relationship and the principles of initiation within ISKCON."'),
  ('disclaimer', '"This portal is operated locally by the temple IDC administration. Information published here is provided by the administrator and does not imply accreditation beyond that supplied by the temple."')
on conflict (key) do nothing;

-- Active course fee configuration (₹1,500 illustrative example).
insert into public.course_fee_settings (
  standard_fee, currency, registration_fee, additional_charges,
  discount_rules, late_fee, late_fee_enabled, payment_instructions,
  refund_policy, require_payment_before_certificate, effective_date, is_active
) values (
  1500, 'INR', 0, 0,
  'Approved by the IDC administration on a case-by-case basis.',
  0, false,
  'Payments can be made in cash, via UPI or by bank transfer. Contact the IDC administration for payment details.',
  'Refunds are issued at the discretion of the IDC administration and are recorded with the original payment.',
  true, current_date, true
)
on conflict (id) do nothing;