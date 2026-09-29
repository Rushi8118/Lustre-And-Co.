# Scheduled jobs and store emails

## What now sends email

| Email | When | To |
| --- | --- | --- |
| Order confirmation | An order is placed | Customer |
| Order status update | Admin changes the status (e.g. dispatched, delivered) | Customer |
| Abandoned cart reminder | A signed-in shopper leaves items untouched for 4 hours | Customer |
| Low stock alert | An order takes a product down to the low-stock level | `ADMIN_EMAIL` |
| Low stock digest | Once a day, everything still low | `ADMIN_EMAIL` |

All of them need working SMTP settings. Until `SMTP_USER` / `SMTP_PASS` hold real
values, each send is skipped with a warning in the logs instead of failing.

## One-time database change

The abandoned-cart job needs a column that records when a reminder was sent.
Run this once in the Supabase SQL editor:

```sql
alter table carts add column if not exists "abandonedEmailSentAt" timestamptz;
```

Carts keep working without it (the reminder simply never sends), and the job
reports the missing column rather than failing silently.

## Running the jobs

Free hosting sleeps an idle server, so the jobs are triggered from outside by
`.github/workflows/store-jobs.yml`: abandoned carts hourly, the low-stock digest
once a day.

1. Pick a long random value for `JOB_SECRET`.
2. Add it on Render: **Environment -> Add Environment Variable**.
3. Add the same value on GitHub: **Settings -> Secrets and variables -> Actions
   -> New repository secret**, named `JOB_SECRET`.

Without `JOB_SECRET` the endpoints stay closed and answer 401, so nobody can
trigger a mail-out by guessing the URL.

To run one by hand: **Actions -> Store jobs -> Run workflow**, then choose the job.

## Rules the reminders follow

- Only signed-in shoppers have a saved cart, so only they can be reminded.
- One reminder per cart. Changing the cart clears the stamp, so a later
  abandonment can be reminded again.
- Carts older than 72 hours are left alone: the nudge is no longer timely.
- Low-stock alerts fire on the order that crosses the threshold, not on every
  later sale of an already-low product.
