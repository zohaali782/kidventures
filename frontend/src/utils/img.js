/**
 * Cloudinary images ke liye ek hi jagah ka resize helper.
 *
 * Masla kya tha: Cloudinary par jo file upload hoti hai wahi original
 * size me wapas serve hoti thi (uploadController koi transformation
 * nahi lagata). AI se bani class photos aksar 2-4 MB ki hoti hain, aur
 * listing page un ko 350px ke card me dikhata tha. Desktop par kam
 * mehsoos hota hai, mobile data par page bhari lagta hai.
 *
 * Ye helper URL me Cloudinary ki transformation daal deta hai:
 *   w_<width>  display size, isse bari image kabhi download nahi hogi
 *   c_limit    chhoti original ko upscale nahi karta (quality safe)
 *   q_auto     Cloudinary khud quality choose karta hai
 *   f_auto     browser support kare to WebP/AVIF bhejta hai (JPEG se
 *              takreeban 30-50% chhota)
 *
 * Non-Cloudinary URL (ya khali value) waisi ki waisi wapas chali jati
 * hai, is liye isay kisi bhi <img src> par lagana mehfooz hai.
 *
 * width hamesha CSS size se thora bara dein (2x tak) taake retina
 * phones par bhi sharp rahe.
 */
export const cldOptimize = (url, width = 400) => {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com")) return url;

  const [head, tail] = url.split("/upload/");
  if (!tail) return url;

  // pehle se transformation lagi ho to dobara nahi lagate
  const firstSegment = tail.split("/")[0];
  if (/(^|,)(w|h|c|q|f|dpr)_/.test(firstSegment)) return url;

  return `${head}/upload/f_auto,q_auto,c_limit,w_${width}/${tail}`;
};

export default cldOptimize;
