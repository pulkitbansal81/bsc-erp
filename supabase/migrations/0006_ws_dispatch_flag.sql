-- v43: Pending Dispatches module ki neev — sale voucher ka dispatch flag ('' = pending)
alter table ws_vouchers add column if not exists dispatch_status text not null default '';
