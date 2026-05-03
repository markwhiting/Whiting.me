---
layout: post
title: "Grammars in biology and medicine"
categories: grammar induction biology medicine CMU
image: biological-grammars.png
---

The grammar induction approach I developed in my PhD <a class="button smallCaps" href="http://doi.org/10.1017/S0890060417000464">AI EDAM</a> was motivated by design, but the underlying problem — recovering structure from noisy examples of complex artifacts — is not specific to things humans make. Working with [Phil LeDuc](https://www.meche.engineering.cmu.edu/directory/bios/leduc-philip.html) and [Jonathan Cagan](https://www.meche.engineering.cmu.edu/directory/bios/cagan-jonathan.html) at [CMU](https://cmu.edu), we extended the method to biological systems, where rules are implicit, numerous, and very noisy <a class="button smallCaps" href="https://doi.org/10.1096/fasebj.31.1_supplement.927.5">FASEB'17</a>.

More recently we applied the same machinery to medical imaging. With collaborators at CMU and the [University of Pittsburgh](https://www.pitt.edu), we induced grammars that describe vascular structure in brain angiograms and used them to classify anomalies <a class="button smallCaps" href="https://doi.org/10.1115/1.4053424">JESMDT'22</a>. The underlying method is covered by [US Patent 11,899,669](https://patents.google.com/patent/US11899669B2/en).

What I like about this line of work is that the same representational move — treating a complex artifact as the output of an unknown grammar — keeps paying off across very different domains. The structure is usually there; the question is whether we can let the data tell us what it is.
