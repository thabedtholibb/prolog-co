-- Katalog tidak lagi terbatas 3 kategori.
-- category = slug bebas (notebook, tote-bag, dst), sumbu varian hanya wajib untuk sudoku.
alter table public.products drop constraint if exists products_category_check;
alter table public.products drop constraint if exists products_category_slug_check;
alter table public.products
  add constraint products_category_slug_check check (category ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

alter table public.product_variants alter column content_axis drop not null;
alter table public.product_variants alter column edition_axis drop not null;
