import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/page-header';
import { EMPTY_PRODUCT, ProductForm } from '@/components/admin/products/product-form';
import { requireAdmin } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'New product' };

export default async function NewProductPage() {
  await requireAdmin('products');
  return (
    <>
      <PageHeader title="New product" back={{ href: '/admin/products', label: 'Products' }} description="Photos and bundles can be added after saving." />
      <ProductForm id={null} initial={EMPTY_PRODUCT} />
    </>
  );
}
