import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingWhatsApp from '@/components/layout/FloatingWhatsApp'
import FloatingChat from '@/components/site/FloatingChat'

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <FloatingChat />
      <FloatingWhatsApp />
    </>
  )
}
