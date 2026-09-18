import JoinForFreeButton from "@/components/landing/join-for-free-button";
import Footer from "@/components/layout/footer";

export default function Home() {
	return (
		<main className="flex flex-col items-center justify-center">
			<section className="flex min-h-svh flex-col items-center justify-center">
				<JoinForFreeButton />
			</section>

			<Footer />
		</main>
	);
}
