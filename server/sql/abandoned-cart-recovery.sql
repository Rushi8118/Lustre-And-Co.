alter table if exists carts
  add column if not exists "recoveryEmail" text,
  add column if not exists "customerName" text,
  add column if not exists phone text,
  add column if not exists recovery_email text,
  add column if not exists customer_name text;

create index if not exists carts_updated_at_idx
  on carts ("updatedAt");

create index if not exists carts_recovery_email_idx
  on carts ("recoveryEmail");

insert into settings (key, store)
values (
  'abandoned_carts',
  '{
    "enabled": true,
    "abandonmentThresholdMinutes": 60,
    "autoRecoveryEmail": true,
    "firstReminderDelayHours": 2,
    "secondReminderDelayHours": 48,
    "couponPercentage": 10,
    "couponCode": "LUSTRE10",
    "firstReminderSubject": "You left something radiant in your bag",
    "firstReminderHeadline": "Your jewelry pieces are waiting for you",
    "firstReminderBody": "We noticed that you left some beautiful pieces in your bag. They are still waiting for you.",
    "secondReminderSubject": "A final reminder from Lustre & Co.",
    "secondReminderHeadline": "Your bag will not stay reserved forever",
    "secondReminderBody": "This is a final reminder about the pieces you selected. Complete your order before they are gone.",
    "senderEmail": ""
  }'::jsonb
)
on conflict (key) do nothing;
