import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Parcerias passou a morar dentro do Marketing. Os enderecos antigos
  // (favoritos, o Atalho do iPhone em /parcerias/nova?link=...) continuam
  // funcionando; a query string acompanha o redirecionamento.
  async redirects() {
    return [
      { source: "/parcerias", destination: "/marketing/parcerias", permanent: false },
      { source: "/parcerias/:path*", destination: "/marketing/parcerias/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
