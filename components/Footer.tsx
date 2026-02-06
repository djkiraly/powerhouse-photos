export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-gray-400">
        <p>&copy; {year} Panhandle Powerhouse. All rights reserved.</p>
        <p>
          Designed and Built by{" "}
          <a
            href="https://rocketcore.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            RocketCore.AI
          </a>
        </p>
      </div>
    </footer>
  );
}
