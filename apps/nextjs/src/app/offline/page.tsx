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
      <div className="relative mx-auto flex min-h-screen max-w-content flex-col items-start justify-center px-6 py-16 text-left text-[#0B0F14]">
        <div className="w-full">
          <Image
            src="/vendgros-logo-white.png"
            alt="VendGros"
            width={220}
            height={60}
            priority
          />
        </div>

        <div className="mt-10 grid w-full items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              We&apos;re down for maintenance.
              <br />
              Be right back!
            </h1>
            <p className="mt-4 max-w-xl text-base text-black/70 sm:text-lg">
              We are deploying improvements to make VendGros faster and more
              reliable. Thanks for your patience.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md">
              <Image
                src="/web-maintenance.png"
                alt="Maintenance illustration"
                width={520}
                height={420}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
