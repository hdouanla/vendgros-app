import Image from "next/image";

export default function OfflinePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-sky-100">
      <Image
        src="/cloud-background.jpg"
        alt="Cloud background"
        fill
        priority
        className="object-cover"
      />
      <div className="relative mx-auto flex min-h-screen max-w-content flex-col items-start justify-between px-6 py-16 text-left text-[#0B0F14]">
        <div className="w-full">
          <Image
            src="/vendgros-logo-web-white.png"
            alt="VendGros"
            width={240}
            height={66}
            priority
          />
        </div>

        <div className="mt-12 grid w-full items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl bg-white/70 p-8 shadow-xl backdrop-blur-sm sm:p-10 lg:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0B4D26]/70">
              Maintenance Mode
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              We&apos;re down for maintenance.
              <br />
              Be right back!
            </h1>
            <p className="mt-4 max-w-xl text-lg text-black/70 sm:text-xl">
              We are deploying improvements to make VendGros faster and more
              reliable. Thanks for your patience.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-black/60">
              <span className="rounded-full border border-black/10 bg-white/70 px-4 py-2">
                Updates in progress
              </span>
              <span className="rounded-full border border-black/10 bg-white/70 px-4 py-2">
                Check back soon
              </span>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-xl drop-shadow-2xl">
              <Image
                src="/web-maintenance.png"
                alt="Maintenance illustration"
                width={720}
                height={560}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
          </div>
        </div>

        <footer className="mt-12 w-full rounded-2xl bg-white/70 p-4 text-sm text-black/70 shadow-md backdrop-blur-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-semibold text-[#0B4D26]">Status:</span>{" "}
              Planned maintenance in progress.
            </div>
            <div>
              <span className="font-semibold text-[#0B4D26]">Support:</span>{" "}
              support@vendgros.com
            </div>
            <div>
              <span className="font-semibold text-[#0B4D26]">ETA:</span>{" "}
              We&apos;ll be back shortly.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
