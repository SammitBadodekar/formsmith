import {
  Inter,
  Roboto,
  Open_Sans,
  Lato,
  Montserrat,
  Poppins,
  Nunito,
  Rubik,
  Work_Sans,
  Source_Sans_3,
  Merriweather,
  Lora,
  Playfair_Display,
  Crimson_Text,
  Bitter,
  Roboto_Slab,
  Cormorant_Garamond,
  Libre_Baskerville,
  Noto_Serif,
  Vollkorn,
  Oswald,
  Raleway,
  Quicksand,
  Josefin_Sans,
  Dancing_Script,
  Abril_Fatface,
  Pacifico,
  Exo_2,
  Karla,
  Fira_Sans,
} from "next/font/google";

const common = {
  display: "swap" as const,
} satisfies {
  display: "auto" | "block" | "swap" | "fallback" | "optional";
};

export const inter = Inter({
  ...common,
  variable: "--font-inter",
  weight: "variable",
});
export const roboto = Roboto({
  ...common,
  variable: "--font-roboto",
  weight: "variable",
});
export const openSans = Open_Sans({
  ...common,
  variable: "--font-open-sans",
  weight: "variable",
});
export const lato = Lato({
  ...common,
  variable: "--font-lato",
  weight: "400",
});
export const montserrat = Montserrat({
  ...common,
  variable: "--font-montserrat",
  weight: "variable",
});
export const poppins = Poppins({
  ...common,
  variable: "--font-poppins",
  weight: "400",
});
export const nunito = Nunito({
  ...common,
  variable: "--font-nunito",
  weight: "variable",
});
export const rubik = Rubik({
  ...common,
  variable: "--font-rubik",
  weight: "variable",
});
export const workSans = Work_Sans({
  ...common,
  variable: "--font-work-sans",
  weight: "variable",
});
export const sourceSans3 = Source_Sans_3({
  ...common,
  variable: "--font-source-sans-3",
  weight: "variable",
});

// Serif
export const merriweather = Merriweather({
  ...common,
  variable: "--font-merriweather",
  weight: "variable",
});
export const lora = Lora({
  ...common,
  variable: "--font-lora",
  weight: "variable",
});
export const playfair = Playfair_Display({
  ...common,
  variable: "--font-playfair-display",
  weight: "variable",
});
export const crimson = Crimson_Text({
  ...common,
  variable: "--font-crimson-text",
  weight: "400",
});
export const bitter = Bitter({
  ...common,
  variable: "--font-bitter",
  weight: "variable",
});
export const robotoSlab = Roboto_Slab({
  ...common,
  variable: "--font-roboto-slab",
  weight: "variable",
});
export const cormorant = Cormorant_Garamond({
  ...common,
  variable: "--font-cormorant",
  weight: "variable",
});
export const libreBaskerville = Libre_Baskerville({
  ...common,
  variable: "--font-libre-baskerville",
  weight: "400",
});
export const notoSerif = Noto_Serif({
  ...common,
  variable: "--font-noto-serif",
  weight: "variable",
});
export const vollkorn = Vollkorn({
  ...common,
  variable: "--font-vollkorn",
  weight: "variable",
});

// Display / Decorative
export const oswald = Oswald({
  ...common,
  variable: "--font-oswald",
  weight: "variable",
});
export const raleway = Raleway({
  ...common,
  variable: "--font-raleway",
  weight: "variable",
});
export const quicksand = Quicksand({
  ...common,
  variable: "--font-quicksand",
  weight: "variable",
});
export const josefinSans = Josefin_Sans({
  ...common,
  variable: "--font-josefin-sans",
  weight: "variable",
});
export const dancing = Dancing_Script({
  ...common,
  variable: "--font-dancing-script",
  weight: "variable",
});
export const abril = Abril_Fatface({
  ...common,
  variable: "--font-abril-fatface",
  weight: "400",
});
export const pacifico = Pacifico({
  ...common,
  variable: "--font-pacifico",
  weight: "400",
});
export const exo2 = Exo_2({
  ...common,
  variable: "--font-exo-2",
  weight: "variable",
});
export const karla = Karla({
  ...common,
  variable: "--font-karla",
  weight: "variable",
});
export const firaSans = Fira_Sans({
  ...common,
  variable: "--font-fira-sans",
  weight: "400",
});
