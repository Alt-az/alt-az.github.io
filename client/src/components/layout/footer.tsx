export default function Footer() {
  return (
    <footer className="bg-secondary text-white py-4 px-6 mt-auto">
      <div className="container mx-auto text-center text-sm">
        <p>© {new Date().getFullYear()} PGF Assistant. All rights reserved.</p>
      </div>
    </footer>
  );
}
