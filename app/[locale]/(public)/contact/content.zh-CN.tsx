export default function ContactContent() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">AiBlocks</p>
      <h1 className="font-display font-bold text-3xl mt-2">联系我们</h1>
      <p className="text-muted mt-3">
        有问题、反馈或需要支持？请通过以下方式联系我们。
      </p>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <section>
          <p className="eyebrow mb-2">地址</p>
          <address className="not-italic text-sm leading-relaxed text-ink">
            Liying Zhu<br />
            Im Rosengärtchen 70<br />
            61440 Oberursel (Taunus)<br />
            德国
          </address>
        </section>

        <section className="space-y-5">
          <div>
            <p className="eyebrow mb-2">邮箱</p>
            <a href="mailto:rheinwegde@gmail.com" className="text-sm text-accent hover:underline">
              rheinwegde@gmail.com
            </a>
          </div>
          <div>
            <p className="eyebrow mb-2">电话</p>
            <a href="tel:+491601168307" className="text-sm text-accent hover:underline">
              +49 160 1168307
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
