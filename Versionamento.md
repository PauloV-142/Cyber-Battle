# Feat: Adding Map V0.1.0
- The map has been added;
- Building collision;
- Tanks collision;

# Fix: Updating the bulltet and tank asset properties V0.1.1: 
- Player2's tank direction has been fixed;
- The tanks are a little bigger now;
- The bullets now have a lower limit;

# Feat: Bullet collision V0.1.2
- The bullet now collide on the buildings
- Setting a name to the asset

**Versionamento**

Sistema que registra as mudanças feitas em um arquivo ou em conjunto de arquivos.

O Git é o melhor exemplo.

**Porque fazer isso?**

Deve haver um registro de porque, quem e quando durante o desenvolvimento de um software.

O Caos:

	Perda de histórico

	Impossibilidade de trabalho em equipe

	Risco de sobrescrever o código de outro programador.

	Sem versionamento: tcc.docx, tcc\_final.docx, tcc\_final2.docx … tcc\_final80087.docx

**Anatomia do Versionamento**  
Estrutura clássica X.Y.Z ex: 1.0.1

X: Major  
Y: Minor  
Z: Patch

Primeira release é 1.0.0

**Path \- \[Z\]**

Correção de bugs, ou uma coisa muito pequena.   
**Quando uma mudança não tem impacto na interface de usuário** ou na API.  
Mesmo assim, qualquer alteração deve ser registrada.  
Deve se ter: quem fez, por que, quem indicou a mudança e quando foi feita.  
Exemplo: O time descobre um vazamento de dados na versão 2.4.1  
Vai para: 2.4.2  
Por mais que seja uma atualização muito importante, não houve mudanças na interface.

**Minor \- \[Y\] (Mudanças Retrocompatíveis\*) (1\.0\.1 \-\> 1\.1\.0)**  
Adição de nova funcionalidade (mesmo se for só um texto que mude na tela ou API)  
O último número é zerado a qualquer mudança no Y  
\*Tudo que já funcionava continua funcionando  
Exemplo: O time adicionou uma barra de pesquisa, na versão 2.4.2  
Vai para: 2.5.0

**Major \- \[X\] (Mudanças de quebra\*)**  
Algo deixa de funcionar mesmo se for pequeno / Remoção de funcionalidades. Não retrocompatível  
\*Regra: Quando são feitas alterações que quebram compatibilidade para versões anteriores.  
O Minor e o Path são zerados

**Regra de ouro do zero (0.x.y) (Instável) (SemVer)**  
Algo deixa de funcionar / Remoção de   
Sistemas em desenvolvimento tem o 0 como Major, porém os outros números são alterados.  
Os números x e y podem passar de 9 (0.24.398)

**Marco 1.0.0 Primeiro deploy para a produção**

**Ciclo de VIda no pré lançamento**  
1.0.0-alpha.1: Versão interna para teste brutos, cheio de bugs.  
1.0.0-beta.3: Funcionalidades prontas, aberta para um grupo menor de clientes testarem (fase de homologação)  
1.0.0-rc-1: se não houver bugs críticos, ele será batizado para 1.0.0.


Questões

1. a) 1.8.4 \-\> 1.8.5  
2. b) 2.4.1 \-\> 3.0.0   \#\#correta é C) 3.0.0  
3. b) 0.4.2 \-\> 0.5.0  
4. a) o Kaínã disse para o Phaulu     \#\#correta é B) 0.5.0  
5. c)

Questões:  
1\) a) 1.8.5  
2\) b) INCREMENTO MINOR, 3.0.0  
3\)    
4\)   
5\) c)

