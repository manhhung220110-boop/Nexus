export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-[600px] rounded-card border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--text-2)]">
      {title} đang được xây dựng ở giai đoạn tiếp theo — quay lại sau nhé.
    </div>
  );
}
