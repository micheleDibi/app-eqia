import identita from "../../../shared/identita.json" with { type: "json" };
import logo from "../assets/eqia-logo.svg";
import logoEduNews24 from "../assets/edunews24/logo.svg";
import logoBandoFit from "../assets/bandofit/logo.png";

export const LOGO_APPLICAZIONE = { src: logo, alt: identita.nome, width: 146, height: 71 };
export const LOGO_EDUNEWS24 = { src: logoEduNews24, alt: "EduNews24", width: 209, height: 41 };
export const LOGO_BANDOFIT = { src: logoBandoFit, alt: "BandoFit", width: 281, height: 72 };
