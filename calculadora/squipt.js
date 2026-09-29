const btnCalcular = document.getElementById('btnCalcular');
const resultado = document.getElementById('resultado');

btnCalcular.addEventListener('click', function () {
    const nome = document.getElementById('nome').value.trim();
    const nota1 = parseFloat(document.getElementById('nota1').value);
    const nota2 = parseFloat(document.getElementById('nota2').value);

    if (!nome) {
        resultado.textContent = 'Por favor, informe seu nome.';
        resultado.className = '';
        return;
    }

    if (isNaN(nota1) || isNaN(nota2)) {
        resultado.textContent = 'Por favor, preencha ambas as notas.';
        resultado.className = '';
        return;
    }

    if (nota1 < 0 || nota1 > 10 || nota2 < 0 || nota2 > 10) {
        resultado.textContent = 'As notas devem estar entre 0 e 10.';
        resultado.className = '';
        return;
    }

    const media = (nota1 + nota2) / 2;
    let situacao = '';
    let classe = '';

    if (media >= 6) {
        situacao = 'Aprovado';
        classe = 'aprovado';
    } else if (media >= 4) {
        situacao = 'Recuperação';
        classe = 'recuperacao';
    } else {
        situacao = 'Reprovado';
        classe = 'reprovado';
    }

    resultado.textContent = nome + ' — Média: ' + media.toFixed(2) + ' — ' + situacao;
    resultado.className = classe;
});
