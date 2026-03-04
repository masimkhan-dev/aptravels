import Navbar from "@/components/public/Navbar";
import Hero from "@/components/public/Hero";
import AirlinesSection from "@/components/public/AirlinesSection";
import AboutSection from "@/components/public/AboutSection";
import ServicesSection from "@/components/public/ServicesSection";
import PackagesSection from "@/components/public/PackagesSection";
import GallerySection from "@/components/public/GallerySection";
import InquiryForm from "@/components/public/InquiryForm";
import FloatingButtons from "@/components/public/FloatingButtons";
import Footer from "@/components/public/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <AirlinesSection />
      <AboutSection />
      <ServicesSection />
      <PackagesSection />
      <GallerySection />
      <InquiryForm />
      <Footer />
      <FloatingButtons />
    </div>
  );
};

export default Index;
